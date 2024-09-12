let tempURL = null;  // Khai báo biến tạm để lưu URL

CMS.registerWidget('update-size', createClass({
  componentDidMount() {
    const { entry } = this.props;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : null;

    // Gán giá trị plistUrl vào biến tempURL
    if (plistUrl) {
      tempURL = plistUrl;
    }
  },

  handleClick() {
    if (!tempURL) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    // Gọi API lấy kích thước IPA dựa trên tempURL
    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(tempURL)}`)
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
    const { loading } = this.state;

    return h('div', { className: 'size-update-widget', style: { display: 'flex', alignItems: 'center' } },
      h('button', { 
        type: 'button', 
        onClick: this.handleClick.bind(this), 
        disabled: loading,
        style: { padding: '5px 10px' }
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước')
    );
  }
}));
CMS.init();