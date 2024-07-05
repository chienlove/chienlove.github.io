const ColorControl = createClass({
  handleChange: function(e) {
    this.props.onChange(e.target.value);
  },

  render: function() {
    return h('input', {
      type: 'color',
      value: this.props.value,
      onChange: this.handleChange
    });
  }
});

const ColorPreview = createClass({
  render: function() {
    return h('div', {
      style: {
        width: '100%',
        height: '80px',
        backgroundColor: this.props.value
      }
    });
  }
});

CMS.registerWidget('color', ColorControl, ColorPreview);