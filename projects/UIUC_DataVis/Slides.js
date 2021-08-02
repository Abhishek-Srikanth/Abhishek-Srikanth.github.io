
const text_slide_0 = `
This slide shows the Total Trade (Import+Export) of each nation as % of national GDP.
<br/>This is also known as Trade Openness Ratio (see https://en.wikipedia.org/wiki/Trade-to-GDP_ratio).
<br/><br/>
It is interesting to note that large economies like Japan and USA tend to rely less
on trade while <br/> smaller economies like Singapore or Djibouti tend to rely heavily on trade.`;
const data_explanation_0 = `
<i>* Since GDP is only the value added domestically, it may happen that small
countries export more than is produced in the country and/or import more
than is consumed in the country and the external trade rate is thus over 100%.</i>`;
const text_slide_1 = `
This slide shows the difference in total trade (as % of GDP) between now and ~60 years since now.<br/>
This helps paint a picture of how much countries have prioritized international trade over the years.
<br/><br/>
It is interesting to note that since 1960, most countries have increased their dependency on trade.<br/>
Very few nations, mostly in Africa, are coloured red (ie: have reduced their reliance on trade)`;
const data_explanation_1 = `
* <i>Red countries are nations that have reduced international trade, while blue
countries have increased international trade. </i>`;
const text_slide_2 = `
This slide shows the difference between exports (%GDP) and imports (%GDP) of goods & services <br/>
While a country might trade a lot internationally, it is important to see whether a majority of it
is driven by imports or exports.
<br/><br/>
It is important to remember that while having mode imports than exports might eventually
lead to a trade deficit, <br/> it can be an efficacious way for the importing nation to
develop itself further and faster so long as they manage the deficit well.`;
const data_explanation_2 = `
* <i>Red countries are nations with a net import, and Blue countries are nations
 with a net export. </i>`;


class Slide {
  constructor(text, descriptor, data_explanation, middleDomains) {
    this.main_narrative = text;
    this.country_spec_descriptor = descriptor;
    this.data_explanation = data_explanation;
    this.data = []
    this.middleDomains = middleDomains;
    this.range = ['red', 'pink', 'lightblue', 'blue'];
  }

  attachDatum(isoAlphaId, datum) {
    if (this.data[isoAlphaId] == null) {
      this.data[isoAlphaId] = datum;
    } else {
      console.log("ERROR - attachDatum has existing value");
    }
  }

  getDatum(isoAlphaId) {
    return this.data[isoAlphaId];
  }

  updateDatum(isoAlphaId, newDatum) {
    if (this.data[isoAlphaId] == null) {
      console.log("WARNING - update called on data that was non-existant");
    }
    this.data[isoAlphaId] = newDatum;
  }

  getSizeOfData() {
    return Object.entries(this.data).length;
  }

  computeDomain() {
    this.sortedDataValues = [];
    for (const [key, value] of Object.entries(this.data)) {
      if (value == undefined) {continue;}
      var v = parseFloat(value);
      if (v == undefined || v == NaN || v == null) {
        console.log("ERROR: parseFloat is acting funny", value, v, key);
      }
      this.sortedDataValues.push(v);
    }
    this.sortedDataValues.sort(function(a,b) { return a - b;});
  }

  getPctIdx(pct, length) {
    return parseInt(pct * length / 100);
  }

  printPct() {  // purely debug function
    [0,1,5,10,25,35,50,65,75,90,95,99,100].forEach(num => {
      var idx = parseInt(num * length / 100);
      console.log(this.sortedDataValues[idx]);
    });
  }

  getDomain() {
    var length = parseInt(this.sortedDataValues.length) - 1;
    var lowerPct = this.getPctIdx(0, length);
    var midPct = this.getPctIdx(50, length);
    var upperPct = this.getPctIdx(100, length);

    var r = [
      this.sortedDataValues[lowerPct],
      this.middleDomains[0],
      this.middleDomains[1],
      this.sortedDataValues[upperPct]];
    return r;
  }

  getScales() {
    if (this.scales == undefined) {
      var domain = this.getDomain();
      this.scales = d3.scaleLinear()
                      .domain(domain)
                      .range(this.range);
      var matchingScales = [];
      domain.forEach(r => matchingScales.push(this.scales(r)));
      console.log(
        "In getScales() --> domain = ", domain,
        "\nCorresponding scales: ", matchingScales);
    }
    return this.scales;
  }
}

var slides = []
slides[0] = new Slide(
    text_slide_0,
    "Total Trade (Import+Export) as % of national GDP",
    data_explanation_0,
    [25,50]);
slides[1] = new Slide(
    text_slide_1,
    "Difference in Trade (Import+Export) as % of GDP between most recent and oldest years",
    data_explanation_1,
    [0,1]);
slides[2] = new Slide(
    text_slide_2,
    "Difference between exports (%GDP) and imports (%GDP) of goods & services",
    data_explanation_2,
    [0,0]);
