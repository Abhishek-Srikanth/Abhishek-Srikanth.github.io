class Annotation {
  constructor(svg, text_x, text_y) {
    this.g = svg.append("g");
    this.line = this.g.append("line");
    this.text = this.g.append("text");
    this.x = text_x;
    this.y = text_y;
  }

  drawAnnotation(source_xy, text) {
    this.line
      .style("stroke-width", 1)
      .style("stroke", "black")
      .attr("x1", source_xy.x)
      .attr("y1", source_xy.y)
      .attr("x2", this.x)
      .attr("y2", this.y)
      .style("visibility", "visible");

    this.text
      .attr("x", this.x)
      .attr("y", this.y)
      .text(text);
  }

  zoomed() {
    this.g.attr("transform", d3.event.transform);
  }
}
