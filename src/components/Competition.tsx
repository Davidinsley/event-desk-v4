

export default function Competition() {
  return (
    <div className="event-details">
      <div className="page-header">
        <h1>Competition</h1>
        <p>
          Define how this competition will be played. This information will be
          used throughout the Event Desk.
        </p>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="competitionName">Competition Name</label>
          <input
            id="competitionName"
            type="text"
            placeholder="e.g. Home & Away Pairs Championship"
          />
        </div>

        <div className="field">
          <label htmlFor="competitionCategory">Competition Category</label>
          <select id="competitionCategory" defaultValue="">
            <option value="">Select...</option>
            <option value="Individual">Individual</option>
            <option value="Pairs">Pairs</option>
            <option value="Team">Team</option>
            <option value="Mixed">Mixed</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="competitionFormat">Competition Format</label>
          <select id="competitionFormat" defaultValue="">
            <option value="">Select...</option>
            <option value="Stableford">Stableford</option>
            <option value="Betterball Stableford">
              Betterball Stableford
            </option>
            <option value="Medal">Medal</option>
            <option value="Texas Scramble">Texas Scramble</option>
            <option value="Greensomes">Greensomes</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="rounds">Number of Rounds</label>
          <input
            id="rounds"
            type="number"
            min="1"
            defaultValue={1}
          />
        </div>

        <div className="field">
          <label htmlFor="allowance">
            Playing Handicap Allowance (%)
          </label>
          <input
            id="allowance"
            type="number"
            defaultValue={100}
          />
        </div>

        <div className="field">
          <label htmlFor="teeColour">Tee Colour</label>
          <select id="teeColour" defaultValue="Yellow">
            <option value="Yellow">Yellow</option>
            <option value="White">White</option>
            <option value="Red">Red</option>
            <option value="Blue">Blue</option>
          </select>
        </div>

        <div
          className="field"
          style={{ gridColumn: "1 / -1" }}
        >
          <label htmlFor="rules">Special Competition Rules</label>
          <textarea
            id="rules"
            rows={8}
            placeholder="Enter any special competition rules here..."
          />
        </div>
      </div>

      <div className="button-bar">
        <button className="primary-button">
          Save Competition Details
        </button>
      </div>
    </div>
  );
}