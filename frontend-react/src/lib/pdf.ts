import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Captura un elemento del DOM y genera un PDF A4 paginado con encabezado IO Solver.
 * Fuerza fondo claro durante la captura para que el PDF sea legible aunque la app
 * esté en modo oscuro.
 */
export async function exportarPDF(el: HTMLElement, filename: string, titulo: string) {
  const wasDark = document.documentElement.classList.contains('dark')
  if (wasDark) document.documentElement.classList.remove('dark')
  await new Promise((r) => setTimeout(r, 60))

  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 12
    const usableW = pageW - margin * 2

    // Encabezado
    pdf.setFillColor(99, 102, 241)
    pdf.rect(0, 0, pageW, 16, 'F')
    pdf.setFontSize(10); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold')
    pdf.text('IO Solver — Investigación de Operaciones', margin, 10.5)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
    pdf.text(titulo, pageW - margin, 10.5, { align: 'right' })

    const imgData = canvas.toDataURL('image/png')
    const imgH = (canvas.height * usableW) / canvas.width
    let y = 22

    if (imgH <= pageH - y - margin) {
      pdf.addImage(imgData, 'PNG', margin, y, usableW, imgH)
    } else {
      let done = 0
      while (done < imgH) {
        const slice = Math.min(imgH - done, pageH - y - margin)
        const sc = document.createElement('canvas')
        sc.width = canvas.width
        sc.height = Math.round((slice / imgH) * canvas.height)
        sc.getContext('2d')!.drawImage(
          canvas, 0, Math.round((done / imgH) * canvas.height),
          canvas.width, sc.height, 0, 0, canvas.width, sc.height,
        )
        pdf.addImage(sc.toDataURL('image/png'), 'PNG', margin, y, usableW, slice)
        done += slice
        if (done < imgH) { pdf.addPage(); y = margin }
      }
    }

    pdf.setFontSize(7.5); pdf.setTextColor(160, 160, 160)
    pdf.text(`Generado por IO Solver · ${new Date().toLocaleDateString('es-MX')}`, margin, pageH - 5)
    pdf.save(filename)
  } finally {
    if (wasDark) document.documentElement.classList.add('dark')
  }
}
