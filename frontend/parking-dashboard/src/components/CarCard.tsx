import type { Car } from "../types";

interface Props {
  car: Car;
  onIssueInvoice: () => void;
  onValidatePayment: () => void;
}

export function CarCard({ car, onIssueInvoice, onValidatePayment }: Props) {
  const paid = car.paymentStatus === "Paid";
  const validated = car.paymentStatus === "Validated";

  return (
    <div className="tile">
      <div className="tile-title">
        <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{car.plate}</span>
        <span className="pill blue">{car.type}</span>
      </div>

      <div className="tile-row">Spot: {car.currentSpot ?? "—"}</div>
      <div className="tile-row">Parked: {car.parkingDurationMinutes} min</div>

      {car.invoice && (
        <>
          <div className="tile-row">
            Parking: ${car.invoice.parkingCost.toFixed(2)}
          </div>
          <div className="tile-row">
            Charging: ${car.invoice.chargingCost.toFixed(2)}
          </div>
          <div className="tile-row" style={{ fontWeight: 600, color: "var(--text)" }}>
            Total: ${car.invoice.total.toFixed(2)}
          </div>
        </>
      )}

      <div className="tile-row">
        <span
          className={
            "pill " +
            (validated ? "green"
             : paid     ? "blue"
             : car.paymentStatus === "Failed" ? "red"
             : "orange")
          }
        >
          {car.paymentStatus}
        </span>
      </div>

      <div className="tile-actions">
        {!car.invoice && (
          <button className="btn" onClick={onIssueInvoice}>
            Issue invoice
          </button>
        )}
        {paid && (
          <button className="btn primary" onClick={onValidatePayment}>
            Validate payment
          </button>
        )}
      </div>
    </div>
  );
}