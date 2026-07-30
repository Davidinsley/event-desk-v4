function NewEvent() {
  return (
    <div className="event-details">

      <div className="page-header">
        <h2>Event Details</h2>
        <div className="event-number">Event #0001</div>
      </div>

      <div className="form-grid">

        <div className="field full-width">
          <label>Event Name</label>
          <input
            type="text"
            placeholder="e.g. Monday Club Home & Away Championship"
          />
        </div>

        <div className="field">
          <label>Event Date</label>
          <input type="date" />
        </div>

        <div className="field">
          <label>Venue</label>
          <input
            type="text"
            placeholder="Ramsdale Park Golf Club"
          />
        </div>

        <div className="field">
          <label>Organiser</label>
          <input
            type="text"
            placeholder="Event Organiser"
          />
        </div>

        <div className="field">
          <label>Event Type</label>
          <input
            type="text"
            placeholder="Pairs Competition"
          />
        </div>

        <div className="field">
          <label>Competition Format</label>
          <input
            type="text"
            placeholder="Betterball Stableford"
          />
        </div>

        <div className="field">
          <label>Entry Fee</label>
          <input
            type="text"
            placeholder="£15.00"
          />
        </div>

        <div className="field">
          <label>Maximum Players</label>
          <input
            type="number"
            placeholder="80"
          />
        </div>

        <div className="field">
          <label>First Tee Time</label>
          <input
            type="time"
          />
        </div>

      </div>

      <div className="button-bar">
        <button className="primary-button">
          Save & Continue
        </button>
      </div>

    </div>
  );
}

export default NewEvent;