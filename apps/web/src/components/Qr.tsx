import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  url: string;
  tamanho?: number;
  legenda?: string;
}

/** QR code em SVG (nítido no projetor em qualquer tamanho). */
export function Qr({ url, tamanho = 220, legenda }: Props) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let vivo = true;
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#10204d', light: '#ffffff' } })
      .then((s) => vivo && setSvg(s))
      .catch(() => vivo && setSvg(''));
    return () => {
      vivo = false;
    };
  }, [url]);

  return (
    <figure className="qr" style={{ width: tamanho }}>
      <div className="qr-imagem" role="img" aria-label={`QR code para ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption>{legenda ?? url.replace(/^https?:\/\//, '')}</figcaption>
    </figure>
  );
}
