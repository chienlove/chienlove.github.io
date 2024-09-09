const UpdateSizeWidget = createClass({
  componentDidMount() {
    // Lắng nghe sự thay đổi của trường plistUrl
    this.props.onChange(this.props.value);
  },

  handleClick() {
    const entry = this.props.entry;
    
    // Lấy giá trị plistUrl
    const plistUrl = entry.getIn(['data', 'main_download', 'plistUrl']);
    
    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }
    
    fetch(`/api/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          // Cập nhật giá trị size trong entry
          const newEntry = entry.setIn(['data', 'size'], data.size);
          this.props.onChange(newEntry.get('data'));
          
          // Thông báo cho người dùng
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          alert('Không thể lấy kích thước file.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi cập nhật kích thước: ' + error.message);
      });
  },

  render() {
    const entry = this.props.entry;
    const currentSize = entry.getIn(['data', 'size']) || 'Chưa cập nhật';
    
    return h('div', {},
      h('button', { type: 'button', onClick: this.handleClick.bind(this) }, 'Cập nhật kích thước'),
      h('span', {}, ` Kích thước hiện tại: ${currentSize}`)
    );
  }
});

CMS.registerWidget('update-size', UpdateSizeWidget);