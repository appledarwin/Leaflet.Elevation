L.Control.Elevation = L.Control.extend({
	options: {
		width: 600,
		height: 125,
		margins: {
			top: 10,
			right: 20,
			bottom: 30,
			left: 50
		},
		hoverNumber: {
			decimals: 2,
			formatter: undefined
		},
		xTicks: undefined,
		yTicks: undefined
	},

	onAdd: function(map) {
		this._map = map;

		map.on("layeradd", function(evt, a, b) {});
		var opts = this.options;
		var margin = opts.margins;
		opts.width = opts.width - margin.left - margin.right;
		opts.height = opts.height - margin.top - margin.bottom;
		opts.xTicks = opts.xTicks || Math.round(opts.width / 75);
		opts.yTicks = opts.yTicks || Math.round(opts.height / 30);
		opts.hoverNumber.formatter = opts.hoverNumber.formatter || this._formatter;

		var x = this._x = d3.scale.linear()
			.range([0, opts.width]);

		var y = this._y = d3.scale.linear()
			.range([opts.height, 0]);

		var area = this._area = d3.svg.area()
			.interpolate("basis")
			.x(function(d) {
			return x(d.dist);
		})
			.y0(opts.height)
			.y1(function(d) {
			return y(d.altitude);
		});

		var container = this._container = L.DomUtil.create("div", "elevation");
		var complWidth = opts.width + margin.left + margin.right;
		var cont = d3.select(container);
		cont.attr("width", complWidth);
		var svg = cont.append("svg");
		svg.attr("width", complWidth)
			.attr("class", "background")
			.attr("height", opts.height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var line = d3.svg.line();
		line = line
			.x(function(d) {
			return d3.mouse(svg.select("g"))[0];
		})
			.y(function(d) {
			return opts.height;
		});

		var g = d3.select(this._container).select("svg").select("g");

		this._areapath = g.append("path")
			.attr("class", "area");

		var background = this._background = g.append("rect")
			.attr("width", opts.width)
			.attr("height", opts.height)
			.style("fill", "none")
			.style("stroke", "none")
			.style("pointer-events", "all");

		background.on("mousemove", this._mousemoveHandler.bind(this));
		background.on("mouseout", this._mouseoutHandler.bind(this));

		this._xaxisgraphicnode = g.append("g");
		this._yaxisgraphicnode = g.append("g");
		this._appendXaxis(this._xaxisgraphicnode);
		this._appendYaxis(this._yaxisgraphicnode);

		var focusG = g.append("g");
		this._mousefocus = focusG.append('svg:line')
			.attr('class', 'link dragline hidden')
			.attr('x2', '0')
			.attr('y2', '0')
			.attr('x1', '0')
			.attr('y1', '0');
		this._focuslabelX = focusG.append("svg:text")
			.style("pointer-events", "none");
		this._focuslabelY = focusG.append("svg:text")
			.style("pointer-events", "none");

		return container;
	},

	_formatter: function(num, dec, sep) {
		var res = L.Util.formatNum(num, dec) + "",
			numbers = res.split(".");
		if (numbers[1]) {
			var d = dec - numbers[1].length;
			for (; d > 0; d--) {
				numbers[1] += "0";
			}
			res = numbers.join(sep || ".");
		}
		return res;
	},

	_appendYaxis: function(y) {
		y.attr("class", "y axis")
			.call(d3.svg.axis()
			.scale(this._y)
			.ticks(this.options.yTicks)
			.orient("left"))
			.append("text")
			.attr("x", 15)
			.style("text-anchor", "end")
			.text("m");
	},

	_appendXaxis: function(x) {
		x.attr("class", "x axis")
			.attr("transform", "translate(0," + this.options.height + ")")
			.call(d3.svg.axis()
			.scale(this._x)
			.ticks(this.options.xTicks)
			.orient("bottom"))
			.append("text")
			.attr("x", this.options.width + 15)
			.style("text-anchor", "end")
			.text("m");
	},

	_updateAxis: function() {
		this._xaxisgraphicnode.selectAll("axis").remove();
		this._yaxisgraphicnode.selectAll("axis").remove();
		this._appendXaxis(this._xaxisgraphicnode);
		this._appendYaxis(this._yaxisgraphicnode);
	},

	_mouseoutHandler: function() {
		if (this._marker) {
			this._map.removeLayer(this._marker);
			this._marker = null;
		}
	},

	_mousemoveHandler: function(d, i, ctx) {
		var coords = d3.mouse(this._background.node());
		var opts = this.options;
		this._mousefocus.attr('x1', coords[0])
			.attr('y1', 0)
			.attr('x2', coords[0])
			.attr('y2', opts.height)
			.classed('hidden', false);
		var bisect = d3.bisector(function(d) {
			return d.dist;
		}).left;
		var xinvert = this._x.invert(coords[0]),
			item = bisect(this._data, xinvert),
			alt = this._data[item].altitude,
			dist = this._data[item].dist,
			ll = this._data[item].latlng,
			numX = opts.hoverNumber.formatter(alt, opts.hoverNumber.decimals),
			numY = opts.hoverNumber.formatter(dist, opts.hoverNumber.decimals);
		this._focuslabelX.attr("x", coords[0])
			.text(numX + " m");
		this._focuslabelY.attr("y", opts.height - 5)
			.attr("x", coords[0])
			.text(numY + " m");
		if (!this._marker) {
			this._marker = new L.Marker(ll).addTo(this._map);
		} else {
			this._marker.setLatLng(ll);
		}
	},

	_addData: function(coords) {
		if (coords) {
			var data = this._data || [];
			var dist = this._dist || 0;
			for (var i = 0; i < coords.length; i++) {
				var s = new L.LatLng(coords[i][1], coords[i][0]);
				var e = new L.LatLng(coords[i ? i - 1 : 0][1], coords[i ? i - 1 : 0][0]);
				data.push({
					dist: dist,
					altitude: coords[i][2],
					x: coords[i][0],
					y: coords[i][1],
					latlng: s
				});
				dist += s.distanceTo(e);
			}
			this._dist = dist;
			this._data = data;
		}
	},

	addData: function(d) {
		var geom = d && d.geometry && d.geometry;
		switch (geom.type) {
			case 'LineString':
				this._addData(geom.coordinates);
				break;

			case 'MultiLineString':
				for (var i = 0; i < geom.coordinates.length; i++) {
					this._addData(geom.coordinates[i]);
				}
				break;

			default:
				throw new Error('Invalid GeoJSON object.');
		}
		var xdomain = d3.extent(this._data, function(d) {
			return d.dist;
		});
		var ydomain = d3.extent(this._data, function(d) {
			return d.altitude;
		});

		this._x.domain(xdomain);
		this._y.domain(ydomain);
		this._areapath.datum(this._data)
			.attr("d", this._area);
		this._updateAxis();
	}
});

L.control.elevation = function(options) {
	return new L.Control.Elevation(options);
};