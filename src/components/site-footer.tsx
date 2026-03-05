import Image from "next/image";
import emailImg from "@/assets/email.png";
import phoneImg from "@/assets/phone.png";
import paintingImg from "@/assets/painting.png";

export function SiteFooter() {
  return (
    <footer className="shop-footer">
      <div className="container footer-grid">
        <div className="footer-col footer-col-contact">
          <strong>Contacto</strong>
          <div className="footer-contact-row">
            <p className="footer-contact-item"><Image src={emailImg} alt="Email" width={52} height={52} className="footer-icon" /> hola@sine.com</p>
            <p className="footer-contact-item"><Image src={phoneImg} alt="WhatsApp" width={52} height={52} className="footer-icon" /> +54 9 11 0000-0000</p>
            <p className="footer-contact-item"><Image src={paintingImg} alt="Instagram" width={52} height={52} className="footer-icon" /> @sine.bolsas</p>
          </div>
        </div>
        <div className="footer-col footer-col-policies">
          <strong>Políticas</strong>
          <p>Solo retiro. Te contactamos por WhatsApp cuando esté listo.</p>
          <p>Horarios de retiro: lun a vie, 15:00 a 19:00.</p>
        </div>
      </div>
    </footer>
  );
}
