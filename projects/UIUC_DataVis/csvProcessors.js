function populate_idToAlpha(iso_numeric_to_alpha) {
  var idToAlpha = [];
  for (var i = 0; i < iso_numeric_to_alpha.length; i++) {
    idToAlpha[iso_numeric_to_alpha[i].ISO3166_1_numeric] =
        iso_numeric_to_alpha[i].ISO3166_1_Alpha_3;
  }
  return idToAlpha;
}

function populate_WDIData(wdi_trade_data) {
  var WDIData = [];
  for (var i = 0; i < wdi_trade_data.length; i++) {
    var wdi_trade_datum = wdi_trade_data[i];
    var isoAlphaId = wdi_trade_datum["Country Code"];
    var indicatorCode = wdi_trade_datum["Indicator Code"];
    var countryName = wdi_trade_datum["Country Name"];
    switch(indicatorCode) {
      case "NE.TRD.GNFS.ZS":  // Trade (% of GDP)
        var mostRecent = getValueFromMostRecentYear(wdi_trade_datum);
        if (mostRecent == undefined) { continue; }
        slides[0].attachDatum(isoAlphaId, mostRecent);
      break;
      case "NE.RSB.GNFS.ZS": // External balance on goods and services (% of GDP)
        var oldest = getValueFromOldestYear(wdi_trade_datum);
        var mostRecent = getValueFromMostRecentYear(wdi_trade_datum);
        var difference = mostRecent - oldest;
        if (mostRecent == undefined) { continue; }
        slides[1].attachDatum(isoAlphaId, difference);
      break;
      case "NE.IMP.GNFS.ZS": // Imports of goods and services (% of GDP)
        // (-1 * ..) used since imports are considered in the negative
        var mostRecent = getValueFromMostRecentYear(wdi_trade_datum);
        if (mostRecent == undefined) { continue; }
        mostRecent *= -1;
        var currentDatum = slides[2].getDatum(isoAlphaId);
        if (currentDatum == null) {
          slides[2].attachDatum(isoAlphaId, mostRecent);
        } else {
          slides[2].updateDatum(isoAlphaId, currentDatum + mostRecent);
        }
      break;
      case "NE.EXP.GNFS.ZS": // Exports of goods and services (% of GDP)
        var mostRecent = getValueFromMostRecentYear(wdi_trade_datum);
        if (mostRecent == undefined) { continue; }
        var currentDatum = slides[2].getDatum(isoAlphaId);
        if (currentDatum == null) {
          slides[2].attachDatum(isoAlphaId, mostRecent);
        } else {
          slides[2].updateDatum(isoAlphaId, currentDatum + mostRecent);
        }
      break;
    }
    var key = [isoAlphaId, indicatorCode];
    WDIData[key] = wdi_trade_data[i];
  }
}

function getValueFromOldestYear(datum) {
  for (var i = 1960; i <= 2020; i++) {
    if (datum[i.toString()] != "") {
      return parseFloat(datum[i.toString()]);
    }
  }
}

function getValueFromMostRecentYear(datum) {
  for (var i = 2020; i >= 1960; i--) {
    if (datum[i.toString()] != "") {
      return parseFloat(datum[i.toString()]);
    }
  }
}
