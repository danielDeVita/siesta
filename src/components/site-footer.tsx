import Image from "next/image";
import typewriterImg from "@/assets/typewriter.png";
import phoneImg from "@/assets/phone.png";
import cameraImg from "@/assets/camera.png";

export function SiteFooter() {
  return (
    <footer className="shop-footer">
      <div className="container footer-grid">
        <div className="footer-col footer-col-contact">
          <strong>Contacto</strong>
          <div className="footer-contact-row">
            <a className="footer-contact-item" href="mailto:holaa.sine@gmail">
              <Image src={typewriterImg} alt="Email" width={52} height={52} className="footer-icon" />
              holaa.sine@gmail
            </a>
            <a
              className="footer-contact-item"
              href="https://wa.me/5491164541770"
              target="_blank"
              rel="noreferrer"
            >
              <Image src={phoneImg} alt="WhatsApp" width={52} height={52} className="footer-icon" />
              +54 9 11 6454 1770
            </a>
            <a
              className="footer-contact-item"
              href="https://www.instagram.com/sine.es.sine/"
              target="_blank"
              rel="noreferrer"
            >
              <Image src={cameraImg} alt="Instagram" width={52} height={52} className="footer-icon" />
              @sine.es.sine
            </a>
          </div>
        </div>
        <div className="footer-col footer-col-policies">
          <strong>Políticas</strong>
          <p>Solo retiro. Te contactamos cuando esté listo.</p>
          <p>Horarios de retiro: lun a vie, 15:00 a 19:00.</p>
        </div>
      </div>
    </footer>
  );
}
