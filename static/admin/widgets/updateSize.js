CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      loading: false,
      plistUrl: '', // Trạng thái để lưu URL plist
    };
  },

  componentDidUpdate(prevProps) {
    // Kiểm tra nếu URL plist thay đổi, tự động lưu vào state
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : '';

    if (plistUrl !== this.state.plistUrl) {
      this.setState({ plistUrl });  // Cập nhật URL plist mới vào state
    }
  },

  handleClick() {
    // Kiểm tra URL plist từ state đã có chưa
    const { plistUrl } = this.state;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    // Bắt đầu quá trình cập nhật
    this.setState({ loading: true });

    // Gọi API để lấy kích thước IPA từ plistUrl
    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          this.props.onChange(data.size);  // Cập nhật kích thước file trong CMS
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
    const loading = this.state.loading;

    return h('div', { className: 'size-update-widget', style: { display: 'flex', alignItems: 'center' } },
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