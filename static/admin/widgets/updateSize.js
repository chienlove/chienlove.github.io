CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      loading: false,
      plistUrl: '', // Lưu URL plist từ trường 'main_download.plistUrl'
    };
  },

  componentDidMount() {
    // Khi widget được tải, lấy giá trị plistUrl từ bài viết và lưu vào state
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : '';
    this.setState({ plistUrl });
  },

  componentDidUpdate(prevProps) {
    // Mỗi khi dữ liệu bài viết thay đổi, cập nhật lại URL plist nếu có
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const newPlistUrl = mainDownload ? mainDownload.get('plistUrl') : '';

    if (newPlistUrl !== this.state.plistUrl) {
      this.setState({ plistUrl: newPlistUrl });
    }
  },

  handleClick() {
    // Lấy URL plist từ state
    const { plistUrl } = this.state;

    if (!plistUrl) {
      // Thông báo nếu chưa có URL plist
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    // Bắt đầu cập nhật
    this.setState({ loading: true });

    // Gọi API để lấy kích thước từ URL plist
    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          this.props.onChange(data.size);  // Cập nhật kích thước trong CMS
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