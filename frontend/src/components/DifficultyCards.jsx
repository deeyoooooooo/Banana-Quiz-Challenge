import { timeLabel } from "../game/difficulties.js";

export default function DifficultyCards({
  difficulties,
  selected,
  onSelect,
  onPlay,
  playingId,
  playable = false,
}) {
  return (
    <div className="difficulty-grid">
      {difficulties.map((mode) => {
        const isSelected = selected === mode.id;
        return (
          <article
            key={mode.id}
            className={`difficulty-card difficulty-${mode.id} ${
              isSelected ? "is-selected" : ""
            }`}
          >
            <button
              type="button"
              className="difficulty-select"
              onClick={() => onSelect?.(mode.id)}
              aria-pressed={isSelected}
            >
              <p className="eyebrow">{mode.tagline}</p>
              <h3>{mode.name}</h3>
              <p>{mode.description}</p>
              <ul>
                <li>{timeLabel(mode.timeLimit)}</li>
                <li>{mode.questions} questions</li>
                <li>{mode.pointsPerCorrectAnswer} points per correct answer</li>
                <li>Maximum score {mode.maxScore}</li>
                {mode.hintsEnabled ? <li>Optional even/odd hint</li> : <li>No hints</li>}
              </ul>
            </button>
            {playable ? (
              <button
                type="button"
                className="button"
                disabled={playingId === mode.id}
                onClick={() => onPlay(mode.id)}
              >
                {playingId === mode.id ? "Starting..." : `Play ${mode.name}`}
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
