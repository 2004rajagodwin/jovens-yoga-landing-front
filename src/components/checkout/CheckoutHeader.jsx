import { Link } from "react-router-dom";

export default function CheckoutHeader() {
  return (
    <header className="checkout-header">
      <Link to="/" className="checkout-header-logo">
        <img src="/images/joven-main-logo.png" alt="Jovens" />
      </Link>
      <Link to="/" className="checkout-header-home-btn">
        Home
      </Link>
    </header>
  );
}
