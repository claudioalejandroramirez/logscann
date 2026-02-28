var FOLDER_ID = "1oDOGNYkD3tW_x03YDlT-TLSGmZuIReeN";

var HEADERS = [
  "Timestamp", "Data", "Hora", "Duração", "Operador", "Entregador",
  "ML", "Shopee", "Avulso", "Total Lido", "Qtd Esperada", "Justificativa",
  "R$ ML", "R$ Shopee", "R$ Avulso", "R$ TOTAL", "Fotos URL", "Códigos"
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var data  = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var now   = new Date();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#f97316");
    }

    var photoUrl = "Sem foto";

    sheet.appendRow([
      now.toISOString(),
      data.date || now.toLocaleDateString('pt-BR'),
      data.time || now.toLocaleTimeString('pt-BR'),
      data.duration || "0 min",
      data.operator || "",
      data.driver   || "",
      data.ml       || 0,
      data.shopee   || 0,
      data.avulso   || 0,
      data.total    || 0,
      data.expected || 0,
      data.justification || "N/A",
      data.valML    || 0,
      data.valShopee|| 0,
      data.valAvulso|| 0,
      data.valTotal || 0,
      photoUrl,
      data.codes || ""
    ]);

    var lastRow = sheet.getLastRow();

    if (data.image && data.image.includes('base64,')) {
      try {
        var folder       = DriveApp.getFolderById(FOLDER_ID);
        var base64Data   = data.image.split('base64,')[1];
        var decodedImage = Utilities.base64Decode(base64Data);
        var nomeArquivo  = 'Saida_' + (data.driver || 'desconhecido').replace(/\s+/g, '_') + '_' + now.getTime() + '.jpg';
        var blob         = Utilities.newBlob(decodedImage, 'image/jpeg', nomeArquivo);
        var file         = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = file.getUrl();

        // Salva o link da foto na coluna 17 ("Fotos URL")
        sheet.getRange(lastRow, 17).setValue(photoUrl);

      } catch (driveErr) {
        sheet.getRange(lastRow, 17).setValue("Erro: " + driveErr.message);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}