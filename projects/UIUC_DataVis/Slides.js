
const text_slide_0 = `
Trade is an essential part of the global supply chain.
However, every country partakes in this differently on the global stage.
The following graph shows us what % of each country's GDP is attributed to trade.
This is also known as Trade Openness Ratio (see https://en.wikipedia.org/wiki/Trade-to-GDP_ratio).
From this graph we observe that nations like <TODO/Singapore> and <TODO> rely heavily on international trade while
larger economies like <TODO/Japan> and <TODO/USA> do not.`;
const text_slide_1 = `
While current state of affairs look this way, it is interesting to see how national priorities have changed historically.
This helps paint a picture of how much countries have prioritized international trade over the years. `;
const text_slide_2 = `
That said, it is important to note that while countries may place greater or lower importance on trade,
they may do so differently. Some might prefer to simply import goods that their nation requires,
while others looks to exporting various products from within their borders.
In this graph, we see how each country leverages trade.
Feel free to click into each country to dive deeper into how trade breaks down.
Red countries are nations with a net import, and Blue countries are nations with a net export.`;

class Slide {
  constructor(text, descriptor) {
    this.main_narrative = text;
    this.country_spec_descriptor = descriptor;
    this.data = []
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
      this.sortedDataValues[midPct],
      this.sortedDataValues[upperPct]];
    return r;
  }

  getScales() {
    if (this.scales == undefined) {
      var domain = this.getDomain();
      domain[1] = 0;
      this.scales = d3.scaleLinear()
                      .domain(domain)
                      .range(['red', 'pink', 'blue']);
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
    "Total Trade (Import+Export) as % of national GDP");
slides[1] = new Slide(
    text_slide_1,
    "Difference in Trade as % of GDP between most recent and oldest years");
slides[2] = new Slide(
    text_slide_2,
    "Difference between exports (%GDP) and imports (%GDP) of goods & services");
