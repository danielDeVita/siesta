import Image from "next/image";
import emailImg from "@/assets/email.png";
import phoneImg from "@/assets/phone.png";
import paintingImg from "@/assets/painting.png";

export function SiteFooter() {
  return (
    <footer className="shop-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            <p className="footer-brand-name">Sine</p>
          </div>
          <strong>Contacto</strong>
          <p><Image src={emailImg} alt="Email" width={52} height={52} className="footer-icon" style={{ display: "inline", verticalAlign: "middle" }} /> hola@sine.com</p>
          <p><Image src={phoneImg} alt="WhatsApp" width={52} height={52} className="footer-icon" style={{ display: "inline", verticalAlign: "middle" }} /> +54 9 11 0000-0000</p>
          <p><Image src={paintingImg} alt="Instagram" width={52} height={52} className="footer-icon" style={{ display: "inline", verticalAlign: "middle" }} /> @sine.bolsas</p>
        </div>
        <div>
          <strong>Políticas</strong>
          <p>Solo retiro. Te contactamos por WhatsApp cuando esté listo.</p>
          <p>Horarios de retiro: lun a vie, 15:00 a 19:00.</p>
        </div>
      </div>
    </footer>
  );
}
