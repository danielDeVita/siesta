import frameImg from "@/assets/frame.jpeg";

/**
 * Marco barroco usando frame.jpeg (1200×1200) como overlay.
 * mix-blend-mode: multiply hace que el fondo blanco del JPEG desaparezca,
 * dejando solo el dorado del marco sobre la imagen del producto.
 */
export function OrnateFrameImage({ children }: { children: React.ReactNode }) {
  return (
    <div className="ornate-frame ornate-frame-isolated">
      <div className="ornate-frame-clip">{children}</div>
      <div className="ornate-frame-img-wrap">
        <img
          src={frameImg.src}
          alt=""
          aria-hidden="true"
          className="ornate-frame-img"
        />
      </div>
    </div>
  );
}
