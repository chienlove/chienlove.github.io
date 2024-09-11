CMS.registerWidget('update-size', createClass({
  componentDidMount() {
    // Lấy dữ liệu từ localStorage khi component được tải lên
    const storedPlistUrl = localStorage.getItem('plistUrl');
    if (storedPlistUrl) {
      this.props.onChange(storedPlistUrl);
    }
  },

  handleClick() {
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : null;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    // Tự động lưu URL plist vào localStorage
    localStorage.setItem('plistUrl', plistUrl);

    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          this.props.onChange(data.size);
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
    const loading = this.state?.loading;
    return h('div', { className: 'size-update-widget', style: { display: 'flex', alignItems: 'center' } },
      h('input', {
        type: 'text',
        value: this.props.value || '',
        onChange: e => {
          const newValue = e.target.value;
          this.props.onChange(newValue);
          // Cập nhật dữ liệu plist vào localStorage khi thay đổi
          localStorage.setItem('plistUrl', newValue);
        },
        disabled: loading,
        style: { marginRight: '10px', width: '150px', padding: '5px' }
      }),
      h('button', { 
        type: 'button', 
        onClick: this.handleClick,
        disabled: loading,
        style: { padding: '5px 10px' }
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước')
    );
  }
}));
CMS.init();