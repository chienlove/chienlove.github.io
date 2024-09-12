CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      loading: false,
      plistUrl: ''  // Biến lưu URL plist tạm thời
    };
  },

  // Đồng bộ dữ liệu plistUrl khi nhập vào trường URL plist
  componentDidUpdate(prevProps) {
    const { entry } = this.props;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : null;

    // Kiểm tra nếu plistUrl có thay đổi thì cập nhật vào state
    if (plistUrl !== this.state.plistUrl) {
      this.setState({ plistUrl });
    }
  },

  handleClick() {
    const { plistUrl } = this.state;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    // Gọi API lấy kích thước IPA từ plistUrl
    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          // Cập nhật kích thước file IPA vào CMS
          this.props.onChange(this.props.entry.setIn(['data', 'size'], data.size));
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          throw new Error('Không nhận được kích thước từ API.');
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
    const { loading, plistUrl } = this.state;

    return h('div', { className: 'size-update-widget', style: { display: 'flex', alignItems: 'center' } },
      h('button', { 
        type: 'button', 
        onClick: this.handleClick.bind(this), 
        disabled: loading || !plistUrl,  // Chỉ cho phép bấm nút khi đã có URL plist
        style: { padding: '5px 10px' }
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước')
    );
  }
}));
CMS.init();