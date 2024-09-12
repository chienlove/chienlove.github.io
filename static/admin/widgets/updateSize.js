CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      loading: false,
      plistUrl: '', // Biến lưu URL plist tạm thời
    };
  },

  // Đảm bảo rằng URL plist đang được lưu lại từ entry khi thay đổi
  componentDidMount() {
    const { entry } = this.props;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : '';

    this.setState({ plistUrl }); // Cập nhật giá trị plistUrl vào state
  },

  handlePlistUrlChange(event) {
    // Khi người dùng nhập URL plist, cập nhật vào state
    this.setState({ plistUrl: event.target.value });
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
      h('input', {
        type: 'text',
        value: plistUrl, // Giá trị URL plist từ state
        onChange: this.handlePlistUrlChange.bind(this), // Khi người dùng nhập, cập nhật giá trị
        placeholder: 'Nhập URL plist...',
        style: { padding: '5px' }
      }),
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