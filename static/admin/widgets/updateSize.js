CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      loading: false,
      plistUrl: '',  // Lưu giá trị plistUrl từ trường chính
    };
  },

  componentDidMount() {
    // Lấy giá trị plistUrl khi component được mount
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : '';
    this.setState({ plistUrl });
  },

  componentDidUpdate(prevProps) {
    // Cập nhật nếu giá trị plistUrl thay đổi
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const newPlistUrl = mainDownload ? mainDownload.get('plistUrl') : '';

    if (newPlistUrl !== this.state.plistUrl) {
      this.setState({ plistUrl: newPlistUrl });
    }
  },

  handleClick() {
    const { plistUrl } = this.state;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    // Gọi API lấy kích thước file IPA
    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          this.props.onChange(data.size);  // Cập nhật kích thước
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          throw new Error('Không tìm thấy kích thước.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Lỗi khi cập nhật kích thước: ' + error.message);
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