CMS.registerWidget('update-size', createClass({
  handleClick() {
    // Lấy URL plist từ CMS
    const plistUrl = this.props.entry.getIn(['data', 'plist_url']);
    if (!plistUrl) {
      alert('Vui lòng nhập URL plist.');
      return;
    }

    // Gọi API để cập nhật kích thước
    fetch(`/api/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          this.props.onChange(data.size);  // Cập nhật giá trị vào trường file_size
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          alert('Không thể lấy kích thước file.');
        }
      })
      .catch(error => {
        console.error(error);
        alert('Có lỗi xảy ra khi cập nhật kích thước.');
      });
  },

  render() {
    return h('button', { type: 'button', onClick: this.handleClick.bind(this) }, 'Cập nhật kích thước');
  }
}));