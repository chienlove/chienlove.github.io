var createClass = window.createClass;
var h = window.h;

var UpdateSizeControl = createClass({
  handleChange: function(e) {
    this.props.onChange(e.target.value);
  },

  updateSize: function() {
    var self = this;
    var plistUrl = document.querySelector('input[name="main_download.plistUrl"]').value;
    
    if (!plistUrl) {
      alert('Vui lòng nhập URL Plist trước khi cập nhật kích thước.');
      return;
    }

    fetch('/.netlify/functions/getIpaSize?url=' + encodeURIComponent(plistUrl))
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.error) {
          throw new Error(data.error);
        }
        self.props.onChange(data.size);
      })
      .catch(function(error) {
        console.error('Error updating size:', error);
        alert('Lỗi khi cập nhật kích thước: ' + error.message);
      });
  },

  render: function() {
    var value = this.props.value || '';

    return h('div', {},
      h('input', {
        type: 'text',
        value: value,
        onChange: this.handleChange
      }),
      h('button', { onClick: this.updateSize }, 'Cập nhật kích thước')
    );
  }
});

CMS.registerWidget('update-size', UpdateSizeControl);