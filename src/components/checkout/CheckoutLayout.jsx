import CheckoutHeader from "./CheckoutHeader.jsx";
import CheckoutFooter from "./CheckoutFooter.jsx";

export default function CheckoutLayout({ children }) {
  return (
    <div className="checkout-page">
      <CheckoutHeader />
      <main className="checkout-page-main">{children}</main>
      <CheckoutFooter />
    </div>
  );
}
