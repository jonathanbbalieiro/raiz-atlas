/**
 * Classificação conservadora das licenças livres exibidas pelo Wikimedia Commons.
 * Não confundir mídia hospedada no Commons com autorização irrestrita: licença,
 * atribuição e eventuais exigências de compartilhamento continuam válidas.
 * Fonte: https://commons.wikimedia.org/wiki/Commons:Licensing
 */
export function classifyCommonsLicense(raw = "") {
  const name = String(raw).trim().replace(/\s+/g, " ");
  if (!name || /\b(?:NC|ND|Non.?commercial|No.?derivative|All rights reserved|Fair use)\b/i.test(name)) {
    return { allowed: false, review: true, reason: "Licença restritiva, ausente ou não identificada" };
  }
  if (/^(?:CC0(?:\s*1\.0)?|Public domain|Public Domain Mark(?:\s*1\.0)?|PD|PDM)$/i.test(name)) {
    return { allowed: true, review: false, reason: "Domínio público ou dedicação CC0" };
  }
  if (/^CC BY(?:-SA)?\s+\d(?:\.\d)?(?:\s+[a-z]{2}(?:-[a-z]{2})?)?$/i.test(name)) {
    return { allowed: true, review: false, reason: "CC com atribuição; respeitar ShareAlike quando houver adaptações" };
  }
  if (/^(?:FAL|LAL|Free Art Licen[cs]e|Licence Art Libre)(?:\s+\d(?:\.\d)?)?$/i.test(name)) {
    return { allowed: true, review: false, reason: "Licença Arte Livre; atribuir e verificar cláusulas de compartilhamento" };
  }
  if (/(?:GFDL|GNU Free Documentation Licen[cs]e)/i.test(name)) {
    return { allowed: true, review: true, reason: "GFDL ou licença dupla livre: pode ser usada com atribuição e revisão editorial" };
  }
  if (/(?:Creative Commons Attribution|CC-BY|CC-BY-SA|Public domain|CC0|PDM|Free Art Licen[cs]e|Licence Art Libre)/i.test(name)) {
    return { allowed: true, review: true, reason: "Licença livre reconhecida de forma ampla; revisar apenas detalhes de atribuição na página" };
  }
  return { allowed: false, review: true, reason: "Licença não livre, ambígua ou não reconhecida automaticamente; revisar página de origem" };
}
