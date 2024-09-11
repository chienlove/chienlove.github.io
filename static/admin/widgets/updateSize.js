CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      plistUrl: this.props.value || '',  // Lấy giá trị khởi tạo từ CMS
      loading: false
    };
  },

  handlePlistUrlChange(event) {
    const plistUrl = event.target.value;
    this.setState({ plistUrl });  // Cập nhật state
    // Lưu plistUrl vào entry ngay khi thay đổi
    this.props.onChange(plistUrl);
  },

  handleClick() {
    const { plistUrl } = this.state;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          this.props.onChange(data.size);  // Cập nhật kích thước file
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          throw new Error('Không nhận được dữ liệu kích thước từ API.');
        }
      })
      .catch(error => {
        console.error('Error in API call:', error);
        alert('Có lỗi xảy ra khi cập nhật kích thước: ' + error.message);
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  },

  render() {
    const { plistUrl, loading } = this.state;

    return h('div', { className: 'size-update-widget', style: { display: 'flex', alignItems: 'center' } },
      h('input', {
        type: 'text',
        value: plistUrl,
        onChange: this.handlePlistUrlChange.bind(this),  // Lưu link plist khi thay đổi
        disabled: loading,
        style: { marginRight: '10px', width: '150px', padding: '5px' }
      }),
      h('button', { 
        type: 'button', 
        onClick: this.handleClick.bind(this),  // Bấm nút để cập nhật kích thước
        disabled: loading,
        style: { padding: '5px 10px' }
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước')
    );
  }
}));
CMS.init();
