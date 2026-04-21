import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Génère et télécharge une facture PDF professionnelle.
 * Compatible jsPDF v2+ / v4+
 *
 * @param {object} facture   - Données de la facture (articles, totaux, numéro…)
 * @param {object} client    - Données du client (nom, adresse, email, tel)
 * @param {object} parametres - Paramètres de la société (societe, facturation)
 */
export function generateInvoicePDF(facture, client, parametres) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PRIMARY   = [63, 81, 181]   // Indigo
  const DARK      = [30, 30, 60]
  const LIGHT_BG  = [245, 246, 255]
  const GREY      = [120, 120, 140]
  const PAGE_W    = 210
  const MARGIN    = 14

  const societe = parametres?.societe || {}
  const dateStr = new Date().toLocaleDateString('fr-FR')

  // ── Bande de couleur en haut (header) ─────────────────────────────────────
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, PAGE_W, 38, 'F')

  // Titre FACTURE
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(255, 255, 255)
  doc.text('FACTURE', MARGIN, 20)

  // Numéro + date (blanc, en haut à droite)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° ${facture.numero || 'Brouillon'}`, PAGE_W - MARGIN, 14, { align: 'right' })
  doc.text(`Date : ${dateStr}`, PAGE_W - MARGIN, 19, { align: 'right' })
  if (facture.statut) {
    doc.text(`Statut : ${facture.statut}`, PAGE_W - MARGIN, 24, { align: 'right' })
  }

  // ── Blocs Société & Client ────────────────────────────────────────────────
  let y = 48

  // Fond léger pour les deux blocs
  doc.setFillColor(...LIGHT_BG)
  doc.roundedRect(MARGIN, y, 82, 38, 2, 2, 'F')
  doc.roundedRect(PAGE_W / 2 + 4, y, 92, 38, 2, 2, 'F')

  // Bloc Société
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PRIMARY)
  doc.text('DE', MARGIN + 3, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.text(societe.nom || 'Ma Société', MARGIN + 3, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GREY)
  if (societe.adresse) doc.text(societe.adresse, MARGIN + 3, y + 20)
  if (societe.email)   doc.text(societe.email,   MARGIN + 3, y + 26)
  if (societe.tel)     doc.text(societe.tel,      MARGIN + 3, y + 32)

  // Bloc Client
  const cx = PAGE_W / 2 + 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PRIMARY)
  doc.text('FACTURÉ À', cx, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text(client?.nom || 'Client inconnu', cx, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GREY)
  if (client?.adresse) doc.text(client.adresse, cx, y + 20)
  if (client?.email)   doc.text(client.email,   cx, y + 26)
  if (client?.tel)     doc.text(client.tel,      cx, y + 32)

  y += 48

  // ── Tableau des articles ──────────────────────────────────────────────────
  const rows = (facture.articles || []).map(a => [
    a.designation || '—',
    String(a.quantite ?? 1),
    `${Number(a.prix_unitaire || 0).toFixed(2)} MAD`,
    a.remise ? `${a.remise}%` : '—',
    `${Number(a.totalLigne ?? (a.quantite * a.prix_unitaire)).toFixed(2)} MAD`,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Qté', 'Prix U.', 'Remise', 'Total Ligne']],
    body: rows,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: DARK,
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: MARGIN, right: MARGIN },
  })

  // ── Totaux ────────────────────────────────────────────────────────────────
  const tableEndY = doc.lastAutoTable.finalY + 6
  const totX = PAGE_W - MARGIN - 70

  doc.setFillColor(...LIGHT_BG)
  const remiseRows = facture.remise_globale > 0 ? 5 : 3
  doc.roundedRect(totX - 4, tableEndY - 2, 76, remiseRows * 7 + 6, 2, 2, 'F')

  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.setFont('helvetica', 'normal')

  let ty = tableEndY + 4

  doc.text('Total HT :', totX, ty)
  doc.setTextColor(...DARK)
  doc.text(`${Number(facture.total_ht ?? 0).toFixed(2)} MAD`, totX + 68, ty, { align: 'right' })

  if (facture.remise_globale > 0) {
    ty += 7
    doc.setTextColor(...GREY)
    doc.text(`Remise globale (${facture.remise_globale}%) :`, totX, ty)
    doc.setTextColor([220, 50, 50])
    const montantRemise = (facture.total_ht * facture.remise_globale / 100)
    doc.text(`- ${montantRemise.toFixed(2)} MAD`, totX + 68, ty, { align: 'right' })

    ty += 7
    doc.setTextColor(...GREY)
    doc.text('Net HT :', totX, ty)
    doc.setTextColor(...DARK)
    doc.text(`${(facture.total_ht * (1 - facture.remise_globale / 100)).toFixed(2)} MAD`, totX + 68, ty, { align: 'right' })
  }

  ty += 7
  doc.setTextColor(...GREY)
  doc.text('TVA :', totX, ty)
  doc.setTextColor(...DARK)
  doc.text(`${Number(facture.tva ?? 0).toFixed(2)} MAD`, totX + 68, ty, { align: 'right' })

  ty += 7
  // Ligne séparatrice
  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(0.5)
  doc.line(totX - 2, ty - 1, totX + 68, ty - 1)

  doc.setFillColor(...PRIMARY)
  doc.roundedRect(totX - 4, ty, 76, 9, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('Total TTC :', totX, ty + 6)
  doc.text(`${Number(facture.total_ttc ?? 0).toFixed(2)} MAD`, totX + 68, ty + 6, { align: 'right' })

  // ── Signature ──────────────────────────────────────────────────────────────
  const sigY = ty + 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GREY)
  doc.text('Signature / Cachet :', MARGIN, sigY)
  doc.setDrawColor(200, 200, 220)
  doc.setLineWidth(0.3)
  doc.rect(MARGIN, sigY + 3, 60, 18)

  // ── Pied de page ──────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 285, PAGE_W, 12, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text(
    `${societe.nom || 'Ma Société'} — ${societe.adresse || ''} — ${societe.email || ''} — ${societe.tel || ''}`,
    PAGE_W / 2, 292, { align: 'center' }
  )

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  doc.save(`Facture_${facture.numero || 'Nouvelle'}.pdf`)
}
