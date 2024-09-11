CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return { loading: false, plistUrl: '' };
  },
  componentDidMount() {
    // Lấy plistUrl từ localStorage khi component được mount
    const savedPlistUrl = localStorage.getItem('plistUrl');
    if (savedPlistUrl) {
      this.setState({ plistUrl: savedPlistUrl });
    }
  },
  handleClick() {
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : this.state.plistUrl;
    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }
    this.setState({ loading: true });
    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.size) {
          // Cập nhật giá trị của trường size trong entry
          const newEntry = entry.setIn(['data', 'size'], data.size);
          this.props.onChange(newEntry);
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
  handlePlistUrlChange(e) {
    const plistUrl = e.target.value;
    this.setState({ plistUrl });
    // Lưu plistUrl vào localStorage
    localStorage.setItem('plistUrl', plistUrl);
  },
  render() {
    const { loading, plistUrl } = this.state;
    return h('div', {},
      h('input', {
        type: 'text',
        value: plistUrl,
        onChange: this.handlePlistUrlChange,
        placeholder: 'Nhập URL plist',
        style: { marginRight: '10px', width: '300px' }
      }),
      h('button', { 
        type: 'button', 
        onClick: this.handleClick,
        disabled: loading 
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước')
    );
  }
}));
CMS.init();