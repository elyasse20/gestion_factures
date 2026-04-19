import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateInvoicePDF(facture, client, parametres) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('FACTURE', 14, 22)
  
  doc.setFontSize(10)
  doc.text(`Numéro: ${facture.numero || 'Brouillon'}`, 14, 30)
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 35)

  // Société infos
  const societe = parametres?.societe || {}
  doc.setFontType('bold')
  doc.text(societe.nom || 'Ma Société', 140, 22)
  doc.setFontType('normal')
  doc.text(societe.adresse || '', 140, 27)
  doc.text(societe.email || '', 140, 32)
  doc.text(societe.tel || '', 140, 37)

  // Client infos
  doc.setFontType('bold')
  doc.text('Facturé à:', 14, 50)
  doc.setFontType('normal')
  doc.text(client?.nom || 'Client inconnu', 14, 55)
  doc.text(client?.adresse || 'Adresse inconnue', 14, 60)

  // Table
  const tableData = facture.articles.map(a => [
    a.designation,
    a.quantite.toString(),
    `${a.prix_unitaire} MAD`,
    a.remise ? `${a.remise}%` : '-',
    `${a.totalLigne || (a.quantite * a.prix_unitaire)} MAD`
  ])

  doc.autoTable({
    startY: 70,
    head: [['Désignation', 'Qté', 'Prix U.', 'Remise', 'Total Ligne']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] } // Indigo-600
  })

  // Totals
  const finalY = doc.lastAutoTable.finalY + 10
  doc.text(`Total HT: ${facture.total_ht?.toFixed(2)} MAD`, 140, finalY)
  if (facture.remise_globale > 0) {
      doc.text(`Remise Globale: ${facture.remise_globale}%`, 140, finalY + 5)
      doc.text(`Net HT: ${(facture.total_ht * (1 - facture.remise_globale/100)).toFixed(2)} MAD`, 140, finalY + 10)
      doc.text(`TVA: ${facture.tva?.toFixed(2)} MAD`, 140, finalY + 15)
      doc.setFontType('bold')
      doc.text(`Total TTC: ${facture.total_ttc?.toFixed(2)} MAD`, 140, finalY + 20)
  } else {
      doc.text(`TVA: ${facture.tva?.toFixed(2)} MAD`, 140, finalY + 5)
      doc.setFontType('bold')
      doc.text(`Total TTC: ${facture.total_ttc?.toFixed(2)} MAD`, 140, finalY + 10)
  }

  // Footer / Signature
  doc.setFontType('normal')
  doc.text('Signature / Cachet:', 14, finalY + 40)

  doc.save(`Facture_${facture.numero || 'Nouvelle'}.pdf`)
}
