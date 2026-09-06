export default function CheckoutFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="checkout-footer">
      <div className="checkout-footer-inner">
        <p className="checkout-footer-copy">© {year} Jovens Academy. All rights reserved.</p>
        <ul className="checkout-footer-links">
          <li>
            <a href="mailto:support@jovensacademy.com">Support</a>
          </li>
          <li>
            <a href="#">Privacy Policy</a>
          </li>
          <li>
            <a href="#">Terms of Service</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
