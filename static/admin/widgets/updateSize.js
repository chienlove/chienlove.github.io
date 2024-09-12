CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      loading: false,
      plistUrl: '', // Biến lưu URL plist từ entry hoặc localStorage
    };
  },

  componentDidMount() {
    const { entry } = this.props;
    
    // Lấy giá trị từ localStorage nếu có
    const savedPlistUrl = localStorage.getItem('tempURL');
    
    // Lấy giá trị từ main_download trong entry
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrlFromEntry = mainDownload ? mainDownload.get('plistUrl') : '';

    // Nếu có giá trị từ localStorage, ưu tiên giá trị đó, nếu không lấy từ entry
    const plistUrl = savedPlistUrl || plistUrlFromEntry;

    if (plistUrl) {
      this.setState({ plistUrl });
      // Cập nhật giá trị vào localStorage để lưu trữ
      localStorage.setItem('tempURL', plistUrl);
    }
  },

  handleClick() {
    const { plistUrl } = this.state;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    // Gọi API để lấy kích thước IPA từ plistUrl
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

    return h('div', { className: 'size-update-widget', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
      h('button', {
        type: 'button',
        onClick: this.handleClick.bind(this),
        disabled: loading || !plistUrl, // Chỉ cho phép bấm nút khi đã có URL plist
        style: { padding: '5px 10px', cursor: plistUrl ? 'pointer' : 'not-allowed' }
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước')
    );
  }
}));
CMS.init();