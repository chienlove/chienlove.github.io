// Đăng ký widget 'update-size'
CMS.registerWidget('update-size', createClass({
  handleClick() {
    // Logic xử lý khi bấm nút cập nhật kích thước
    const plistUrl = this.props.entry.getIn(['data', 'main_download', 'plistUrl']);
    
    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }
    
    // Gọi API cập nhật kích thước
    fetch(`/api/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          const updatedEntry = this.props.entry.get('data').set('size', data.size);
          this.props.onChange(updatedEntry);
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          alert('Không thể lấy kích thước file.');
        }
      })
      .catch(error => alert('Có lỗi xảy ra: ' + error.message));
  },
  render() {
    const currentSize = this.props.entry.getIn(['data', 'size']) || '';
    return h('div', {},
      h('button', { type: 'button', onClick: this.handleClick.bind(this) }, 'Cập nhật kích thước'),
      currentSize ? h('span', {}, ` Kích thước hiện tại: ${currentSize}`) : null
    );
  }
}));

// Khởi tạo CMS (có thể trong file khác hoặc ngay sau đoạn trên)
CMS.init();