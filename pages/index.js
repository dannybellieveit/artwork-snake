import Head from 'next/head';
import { useMemo } from 'react';

const posts = [
  {
    title: 'Rethinking Tools',
    date: '2024-04-18',
    summary:
      'Exploring the balance between analog and digital workflows, and how simplicity keeps projects moving forward.',
  },
  {
    title: 'Sketchbook Notes',
    date: '2024-02-07',
    summary:
      'A quick reflection on the sketches that eventually became the spring collection, plus a few process photos.',
  },
  {
    title: 'Hello There',
    date: '2023-12-10',
    summary:
      'Why I decided to build this ongoing timeline and how I hope to use it as a living archive.',
  },
];

export default function BlogTimeline() {
  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, []);

  const latestPost = sortedPosts[0];
  const timelinePosts = sortedPosts.slice(1);
  const hasTimelinePosts = timelinePosts.length > 0;

  return (
    <>
      <Head>
        <title>Notes — Personal Timeline</title>
        <meta
          name="description"
          content="A simple chronological log of updates and notes, designed to stay current with the latest entry up top."
        />
      </Head>
      <main className="page">
        <header className="hero">
          <p className="hero__eyebrow">Notes</p>
          <h1 className="hero__title">A running log of what I am building and thinking.</h1>
          <p className="hero__lede">
            Every entry drops into the timeline in chronological order. Add a new post with a
            timestamp and it will automatically slot into place.
          </p>
        </header>

        <section className="latest">
          <div className="section-heading">
            <span className="section-heading__rule" />
            <h2 className="section-heading__title">Latest post</h2>
          </div>
          <article className="card">
            <time dateTime={latestPost.date} className="card__date">
              {new Date(latestPost.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
            <h3 className="card__title">{latestPost.title}</h3>
            <p className="card__summary">{latestPost.summary}</p>
            <a className="card__button" href="#timeline">
              Read post
            </a>
          </article>
        </section>

        <section className="timeline" id="timeline">
          <div className="section-heading">
            <span className="section-heading__rule" />
            <h2 className="section-heading__title">Timeline</h2>
          </div>
          {hasTimelinePosts ? (
            <ol className="timeline__list">
              {timelinePosts.map((post) => (
                <li key={post.title} className="timeline__item">
                  <div className="timeline__dot" aria-hidden="true" />
                  <div className="timeline__content">
                    <time dateTime={post.date} className="timeline__date">
                      {new Date(post.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                    <h3 className="timeline__title">{post.title}</h3>
                    <p className="timeline__summary">{post.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="timeline__empty">
              Add more entries to build out the archive. Previous posts will stack here in chronological order.
            </p>
          )}
        </section>
      </main>

      <style jsx>{`
        :global(html, body) {
          padding: 0;
          margin: 0;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f8f7f4;
          color: #141414;
        }

        :global(*) {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 72px 24px 96px;
          max-width: 960px;
          margin: 0 auto;
          gap: 72px;
        }

        .hero {
          display: grid;
          gap: 16px;
        }

        .hero__eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.75rem;
          color: rgba(20, 20, 20, 0.5);
          margin: 0;
        }

        .hero__title {
          font-size: clamp(2.5rem, 4vw, 3.5rem);
          line-height: 1.1;
          margin: 0;
        }

        .hero__lede {
          margin: 0;
          max-width: 56ch;
          font-size: 1.1rem;
          line-height: 1.6;
          color: rgba(20, 20, 20, 0.72);
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .section-heading__rule {
          display: inline-block;
          width: 48px;
          height: 1px;
          background: rgba(20, 20, 20, 0.2);
        }

        .section-heading__title {
          margin: 0;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
        }

        .latest {
          display: grid;
          gap: 24px;
        }

        .card {
          background: #ffffff;
          border: 1px solid rgba(20, 20, 20, 0.08);
          border-radius: 20px;
          padding: 32px;
          display: grid;
          gap: 12px;
          box-shadow: 0 12px 24px rgba(20, 20, 20, 0.08);
        }

        .card__date {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: rgba(20, 20, 20, 0.5);
        }

        .card__title {
          margin: 0;
          font-size: 1.6rem;
          line-height: 1.3;
        }

        .card__summary {
          margin: 0;
          line-height: 1.6;
          color: rgba(20, 20, 20, 0.68);
        }

        .card__button {
          margin-top: 8px;
          justify-self: start;
          border: 1px solid rgba(20, 20, 20, 0.16);
          border-radius: 999px;
          padding: 10px 20px;
          background: transparent;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
          text-decoration: none;
          color: inherit;
        }

        .card__button:hover,
        .card__button:focus-visible {
          border-color: rgba(20, 20, 20, 0.36);
          background: rgba(20, 20, 20, 0.04);
          outline: none;
        }

        .timeline {
          display: grid;
          gap: 24px;
        }

        .timeline__list {
          list-style: none;
          margin: 0;
          padding: 0;
          border-left: 1px solid rgba(20, 20, 20, 0.15);
        }

        .timeline__item {
          position: relative;
          padding: 0 0 32px 32px;
        }

        .timeline__item:last-child {
          padding-bottom: 0;
        }

        .timeline__dot {
          position: absolute;
          left: -6px;
          top: 6px;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #141414;
        }

        .timeline__content {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(20, 20, 20, 0.08);
          box-shadow: 0 8px 16px rgba(20, 20, 20, 0.06);
          display: grid;
          gap: 8px;
        }

        .timeline__date {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: rgba(20, 20, 20, 0.45);
        }

        .timeline__title {
          margin: 0;
          font-size: 1.3rem;
        }

        .timeline__summary {
          margin: 0;
          line-height: 1.6;
          color: rgba(20, 20, 20, 0.68);
        }

        .timeline__empty {
          margin: 0;
          font-size: 1rem;
          line-height: 1.6;
          color: rgba(20, 20, 20, 0.6);
        }

        @media (max-width: 720px) {
          .page {
            padding: 56px 20px 80px;
            gap: 56px;
          }

          .card,
          .timeline__content {
            padding: 24px;
          }

          .timeline__item {
            padding-left: 28px;
          }

          .timeline__dot {
            left: -7px;
          }
        }
      `}</style>
    </>
  );
}
