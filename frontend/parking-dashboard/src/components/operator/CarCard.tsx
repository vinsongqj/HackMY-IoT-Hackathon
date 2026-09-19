import type { Car } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface Props {
  car: Car;
  onIssueInvoice: (plate: string) => void;
  onValidatePayment: (plate: string) => void;
  onSendExit: (plate: string) => void;
}

export function CarCard({ car, onIssueInvoice, onValidatePayment, onSendExit }: Props) {
  const statusTone =
    car.paymentStatus === "Validated" ? "green"  :
    car.paymentStatus === "Paid"      ? "blue"   :
    car.paymentStatus === "Requested" ? "orange" :
    car.paymentStatus === "Failed"    ? "red"    : "gray";

  return (
    <div className="tile">
      <div className="tile-title">
        <span>{car.plate}</span>
        <Badge tone={car.type === "Electric" ? "blue" : "gray"}>{car.type}</Badge>
      </div>

      <div className="tile-row">Spot: {car.currentSpot ?? "—"}</div>
      <div className="tile-row">Duration: {car.parkingDurationMinutes} min</div>

      {car.invoice && (
        <>
          <div className="tile-row">Parking: ${car.invoice.parkingCost.toFixed(2)}</div>
          <div className="tile-row">Charging: ${car.invoice.chargingCost.toFixed(2)}</div>
          <div className="tile-row" style={{ color: "var(--text)" }}>
            Total: <b>${car.invoice.total.toFixed(2)}</b>
          </div>
        </>
      )}

      <div>
        <Badge tone={statusTone}>{car.paymentStatus}</Badge>
      </div>

      <div className="tile-actions">
        {!car.invoice && (
          <Button onClick={() => onIssueInvoice(car.plate)}>Issue invoice</Button>
        )}
        {car.paymentStatus === "Paid" && (
          <Button variant="primary" onClick={() => onValidatePayment(car.plate)}>
            Validate
          </Button>
        )}
        {car.paymentStatus === "Validated" && (
          <Button variant="primary" onClick={() => onSendExit(car.plate)}>
            Send to exit
          </Button>
        )}
      </div>
    </div>
  );
}