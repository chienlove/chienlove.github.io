CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return { loading: false };
  },
  handleClick() {
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : '';

    if (!plistUrl) {
      alert('Vui lòng điền URL plist vào trường "Plist URL" trong phần "Liên kết tải xuống chính" trước khi cập nhật kích thước.');
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
  render() {
    const { loading } = this.state;
    const size = this.props.entry.getIn(['data', 'size']);

    return h('div', {},
      h('button', { 
        type: 'button', 
        onClick: this.handleClick,
        disabled: loading 
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước'),
      h('span', { style: { marginLeft: '10px' } }, 
        size ? `Kích thước hiện tại: ${size}` : 'Chưa có kích thước'
      )
    );
  }
}));
CMS.init();