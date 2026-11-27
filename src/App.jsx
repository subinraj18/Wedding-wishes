import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";
import "./App.css";

const COUPLE = {
  bride: "Swaliha Sulfi",
  groom: "Asif Ali",
  date: "03 – 01 – 2027",
};

const BISMILLAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

function Ornament({ heart = false }) {
  return (
    <div className="ornament" aria-hidden="true">
      <i />
      {heart ? (
        <b>♥</b>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <rect x="6" y="6" width="12" height="12" />
          <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
        </svg>
      )}
      <i />
    </div>
  );
}

function formatDate(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : null;
  if (!date) return "Just now";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError("Incorrect email or password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-arch">
        <p className="arabic bismillah" lang="ar">
          {BISMILLAH}
        </p>
        <p className="eyebrow">Private Keepsake</p>
        <h1 className="login-title">
          <span className="script-name">{COUPLE.bride}</span>
          <small className="ampersand">&amp;</small>
          <span className="script-name">{COUPLE.groom}</span>
        </h1>
        <Ornament heart />
        <p className="login-sub">
          Sign in to read the blessings and messages sent by your loved ones.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="couple@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button
            className="primary-button full-width"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Opening Keepsake…" : "Open Our Wishes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function WishModal({ wish, onClose, onPrev, onNext, hasPrev, hasNext, onToggleFav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      className="modal-backdrop no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close message"
        >
          ✕
        </button>

        <div className="quote-mark" aria-hidden="true">“</div>
        <p className="modal-message">{wish.message}</p>
        <Ornament heart />

        <div className="modal-sender">
          <h3>{wish.name}</h3>
          {wish.relation && <span className="relation-pill">{wish.relation}</span>}
          <time className="wish-time">{formatDate(wish.createdAt)}</time>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={onPrev}
            disabled={!hasPrev}
          >
            ← Previous
          </button>

          <button
            type="button"
            className={`fav-button${wish.favorite ? " active" : ""}`}
            onClick={() => onToggleFav(wish)}
            aria-label={wish.favorite ? "Remove from favourites" : "Add to favourites"}
          >
            {wish.favorite ? "♥ Favourited" : "♡ Favourite"}
          </button>

          <button
            type="button"
            className="ghost-button"
            onClick={onNext}
            disabled={!hasNext}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

const EXPORT_LAYOUTS = [
  {
    id: "four",
    title: "Four per Page",
    text: "Four full-width message cards on every page, after a cover page. Best for a clean printed copy.",
  },
  {
    id: "compact",
    title: "Compact List",
    text: "Two columns with several messages on each page. Best for reading quickly or saving paper.",
  },
];

function ExportModal({ count, onClose, onSelect }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
    >
      <div className="modal-card export-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <h2 id="export-title" className="export-title">Save as PDF</h2>
        <p className="export-sub">
          Choose a layout. {count} {count === 1 ? "message" : "messages"} will be
          included, based on your current search and filter.
        </p>

        <div className="layout-options">
          {EXPORT_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              className="layout-option"
              onClick={() => onSelect(l.id)}
              disabled={count === 0}
            >
              <span className={`layout-preview ${l.id}`} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              <strong>{l.title}</strong>
              <small>{l.text}</small>
            </button>
          ))}
        </div>

        <p className="export-hint">
          In the print window, set the destination to “Save as PDF”.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [wishes, setWishes] = useState([]);
  const [loadingWishes, setLoadingWishes] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [activeWishId, setActiveWishId] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [printLayout, setPrintLayout] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setWishes([]);
      setLoadingWishes(false);
      return;
    }

    setLoadingWishes(true);
    const q = query(collection(db, "wishes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setWishes(list);
        setLoadingWishes(false);
      },
      () => setLoadingWishes(false)
    );

    return unsubscribe;
  }, [user]);

  // Clear the chosen print layout once the print dialog closes.
  useEffect(() => {
    const reset = () => setPrintLayout(null);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  const relations = useMemo(() => {
    const set = new Set();
    wishes.forEach((w) => {
      if (w.relation?.trim()) set.add(w.relation.trim());
    });
    return Array.from(set);
  }, [wishes]);

  const filteredWishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wishes.filter((w) => {
      if (filter === "favorites" && !w.favorite) return false;
      if (
        filter !== "all" &&
        filter !== "favorites" &&
        (w.relation || "").trim() !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (w.name || "").toLowerCase().includes(q) ||
        (w.relation || "").toLowerCase().includes(q) ||
        (w.message || "").toLowerCase().includes(q)
      );
    });
  }, [wishes, search, filter]);

  const favoriteCount = useMemo(
    () => wishes.filter((w) => w.favorite).length,
    [wishes]
  );

  const activeIndex = useMemo(
    () => filteredWishes.findIndex((w) => w.id === activeWishId),
    [filteredWishes, activeWishId]
  );
  const activeWish = activeIndex >= 0 ? filteredWishes[activeIndex] : null;

  const toggleFavorite = async (wish) => {
    await updateDoc(doc(db, "wishes", wish.id), {
      favorite: !wish.favorite,
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "wishes", id));
    setConfirmDeleteId(null);
    if (activeWishId === id) setActiveWishId(null);
  };

  const handleExport = (layout) => {
    setShowExport(false);
    setPrintLayout(layout);
    // Wait for the layout class to be applied before opening the print dialog.
    setTimeout(() => window.print(), 200);
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="login-shell">
        <div className="login-arch">
          <p className="eyebrow">Setup Required</p>
          <h1 className="login-title">Firebase Config Missing</h1>
          <Ornament />
          <p className="login-sub">
            Add your <code>VITE_FIREBASE_*</code> keys to a <code>.env</code> file
            and restart the dev server to connect the guestbook database.
          </p>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="login-shell">
        <p className="eyebrow">Opening keepsake…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className={`app-shell${printLayout ? ` layout-${printLayout}` : ""}`}>
      {/* Print-only cover / heading */}
      <section className="print-cover print-only" aria-hidden="true">
        <p className="arabic bismillah" lang="ar">{BISMILLAH}</p>
        <p className="eyebrow">Wedding Wishes &amp; Blessings</p>
        <h1 className="cover-names">
          <span className="script-name">{COUPLE.bride}</span>
          <span className="ampersand">&amp;</span>
          <span className="script-name">{COUPLE.groom}</span>
        </h1>
        <Ornament heart />
        <p className="hero-date">{COUPLE.date}</p>
        <p className="cover-count">
          {filteredWishes.length} heartfelt {filteredWishes.length === 1 ? "message" : "messages"}
        </p>
      </section>

      <header className="hero-header">
        <nav className="top-nav no-print">
          <span className="brand">Swaliha &amp; Asif</span>
          <div className="nav-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setShowExport(true)}
            >
              Save as PDF
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => signOut(auth)}
            >
              Sign Out
            </button>
          </div>
        </nav>

        <div className="hero-arch">
          <p className="arabic bismillah" lang="ar">
            بَارَكَ اللَّهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا
          </p>
          <p className="eyebrow">Wedding Wishes &amp; Blessings</p>
          <h1>
            <span className="script-name name-bride">{COUPLE.bride}</span>
            <span className="ampersand">&amp;</span>
            <span className="script-name name-groom">{COUPLE.groom}</span>
          </h1>
          <Ornament heart />
          <p className="hero-date">{COUPLE.date}</p>

          <div className="stats-row">
            <div className="stat">
              <span>{wishes.length}</span>
              <small>{wishes.length === 1 ? "Wish" : "Wishes"}</small>
            </div>
            <div className="stat-sep" aria-hidden="true">✦</div>
            <div className="stat">
              <span>{favoriteCount}</span>
              <small>Favourites</small>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="toolbar no-print" aria-label="Filter and search wishes">
          <div className="search-wrap">
            <input
              type="search"
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, family, or words…"
              aria-label="Search wishes"
            />
          </div>

          <div className="filter-pills" role="tablist">
            <button
              type="button"
              className={`pill${filter === "all" ? " active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({wishes.length})
            </button>
            <button
              type="button"
              className={`pill${filter === "favorites" ? " active" : ""}`}
              onClick={() => setFilter("favorites")}
            >
              ♥ Favourites ({favoriteCount})
            </button>
            {relations.map((rel) => (
              <button
                key={rel}
                type="button"
                className={`pill${filter === rel ? " active" : ""}`}
                onClick={() => setFilter(rel)}
              >
                {rel}
              </button>
            ))}
          </div>
        </section>

        {loadingWishes ? (
          <div className="empty-state">
            <p className="small-script">Gathering your blessings…</p>
          </div>
        ) : filteredWishes.length === 0 ? (
          <div className="empty-state">
            <Ornament />
            <p className="small-script">
              {wishes.length === 0
                ? "No messages yet"
                : "No wishes match your search"}
            </p>
            <p className="empty-sub">
              {wishes.length === 0
                ? "As soon as friends and family write a note on the invitation site, it will appear here live."
                : "Try clearing the search box or switching back to All wishes."}
            </p>
          </div>
        ) : (
          <section className="wishes-grid" aria-label="Guest messages">
            {filteredWishes.map((wish) => {
              const isConfirming = confirmDeleteId === wish.id;
              return (
                <article
                  key={wish.id}
                  className={`wish-card${wish.favorite ? " is-fav" : ""}`}
                  onClick={() => setActiveWishId(wish.id)}
                >
                  <button
                    type="button"
                    className={`icon-heart no-print${wish.favorite ? " active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(wish);
                    }}
                    aria-label={
                      wish.favorite ? "Remove from favourites" : "Add to favourites"
                    }
                  >
                    {wish.favorite ? "♥" : "♡"}
                  </button>

                  <span className="quote-mark" aria-hidden="true">“</span>

                  <p className="wish-message">{wish.message}</p>

                  <div className="wish-divider" aria-hidden="true">
                    <i />
                    <span>✦</span>
                    <i />
                  </div>

                  <footer className="wish-footer">
                    <h2 className="wish-name">{wish.name}</h2>
                    <div className="wish-meta">
                      {wish.relation && (
                        <span className="relation-pill">{wish.relation}</span>
                      )}
                      <time className="wish-time">
                        {formatDate(wish.createdAt)}
                      </time>
                    </div>

                    <div
                      className="delete-wrap no-print"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isConfirming ? (
                        <div className="confirm-row">
                          <button
                            type="button"
                            className="danger-link"
                            onClick={() => handleDelete(wish.id)}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            className="muted-link"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="muted-link"
                          onClick={() => setConfirmDeleteId(wish.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </footer>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <footer className="site-footer no-print">
        <p className="arabic" lang="ar">
          جَمَعَ اللَّهُ بَيْنَكُمَا فِي خَيْرٍ
        </p>
        <p>With love, {COUPLE.bride} &amp; {COUPLE.groom}</p>
      </footer>

      {activeWish && (
        <WishModal
          wish={activeWish}
          onClose={() => setActiveWishId(null)}
          hasPrev={activeIndex > 0}
          hasNext={activeIndex < filteredWishes.length - 1}
          onPrev={() => setActiveWishId(filteredWishes[activeIndex - 1].id)}
          onNext={() => setActiveWishId(filteredWishes[activeIndex + 1].id)}
          onToggleFav={toggleFavorite}
        />
      )}

      {showExport && (
        <ExportModal
          count={filteredWishes.length}
          onClose={() => setShowExport(false)}
          onSelect={handleExport}
        />
      )}
    </div>
  );
}