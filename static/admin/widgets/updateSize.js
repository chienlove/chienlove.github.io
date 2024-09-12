CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      loading: false,
      plistUrl: '', // Lưu trạng thái URL plist cục bộ
    };
  },

  componentDidMount() {
    // Lấy URL plist từ dữ liệu bài viết (nếu đã có)
    const entry = this.props.entry;
    const plistUrl = entry.getIn(['data', 'main_download', 'plistUrl']) || '';
    
    // Lưu URL plist vào state và localStorage ngay khi người dùng điền vào
    this.setState({ plistUrl });
    localStorage.setItem('plistUrl', plistUrl); // Lưu cục bộ
  },

  handleClick() {
    // Lấy URL plist đã lưu trong localStorage
    const plistUrl = localStorage.getItem('plistUrl');

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    // Bắt đầu cập nhật
    this.setState({ loading: true });

    // Gọi API để lấy kích thước IPA từ plistUrl đã lưu cục bộ
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

    // Không hiển thị khung nhập cho URL plist nữa
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