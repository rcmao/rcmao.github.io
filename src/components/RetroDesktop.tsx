import Window from "./Window";
import { playWin7NavigationClick } from "../audio/win7Click";
import { profile, publications, type Publication } from "../data/site";

type RetroDesktopProps = {
  deskMusicPlaying: boolean;
  onToggleDeskMusic: () => void;
  onBackToDesk: () => void;
  onShowPublication: (publication: Publication) => void;
};

function RetroDesktop({
  deskMusicPlaying,
  onToggleDeskMusic,
  onBackToDesk,
  onShowPublication,
}: RetroDesktopProps) {
  return (
    <div className="retro-desktop">
      <header className="retro-topbar">
        <button
          type="button"
          onClick={() => {
            playWin7NavigationClick();
            onBackToDesk();
          }}
        >
          Back to 3D Desk
        </button>
        <strong>Ruochen Academic World 7</strong>
        <button
          type="button"
          onClick={() => {
            playWin7NavigationClick();
            onToggleDeskMusic();
          }}
        >
          {deskMusicPlaying ? "Pause CD" : "Play CD"}
        </button>
      </header>

      <div className="windows-layout">
        <Window title="profile.exe" className="profile-window" defaultPosition={{ x: 0, y: 8 }}>
          <img className="retro-avatar" src={profile.avatar} alt={`Portrait of ${profile.name}`} />
          <h1>{profile.name}</h1>
          <p className="role">{profile.role}</p>
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <p className="focus-text">{profile.focus}</p>
          <div className="social-row">
            {profile.socials.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </Window>

        <Window title="about-me.txt" className="about-window" defaultPosition={{ x: -8, y: 36 }}>
          {profile.bio.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="seeking-note">{profile.seeking}</p>
        </Window>

        <Window title="publications.folder" className="publications-window" defaultPosition={{ x: 12, y: 82 }}>
          <div className="publication-grid">
            {publications.map((publication) => (
              <article className="publication-card" key={publication.id}>
                <img src={publication.image} alt={`Figure for ${publication.title}`} />
                <div>
                  <h2>{publication.title}</h2>
                  <p className="authors">{publication.authors}</p>
                  <p className="venue">{publication.venue}</p>
                  <div className="publication-actions">
                    <button
                      type="button"
                      onClick={() => {
                        playWin7NavigationClick();
                        onShowPublication(publication);
                      }}
                    >
                      Details
                    </button>
                    {publication.links.map((link) => (
                      <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Window>

      </div>
    </div>
  );
}

export default RetroDesktop;
