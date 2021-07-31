class Annotation {
  constructor(svg, note_x, note_y, fill_color) {
    this.g = svg.append("g");
    this.lineObj = this.g.append("line");
    this.textObj = this.g.append("text").style("fill", fill_color);

    this.x = note_x;
    this.y = note_y;
  }

  drawAnnotation(source_xy, name, value) {
    console.log("annotation for: ", value, name, source_xy);
    this.lineObj
      .style("stroke-width", 0.5)
      .style("stroke", "black")
      .attr("x1", source_xy.x)
      .attr("y1", source_xy.y)
      .attr("x2", this.x)
      .attr("y2", this.y)
      .style("visibility", "visible");

    this.textObj
      .attr("x", this.x)
      .attr("y", this.y)
      .text(name + " (" + value.toFixed(2) + "%)");
  }

  zoomed() {
    this.g.attr("transform", d3.event.transform);
  }
}
