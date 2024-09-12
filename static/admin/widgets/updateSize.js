CMS.registerWidget('update-size', createClass({
  handleClick() {
    const { entry, onChange } = this.props;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : null;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    // Lưu dữ liệu vào CMS
    this.props.onChange(entry.setIn(['data', 'main_download', 'plistUrl'], plistUrl));
    this.props.onChange(entry.persist())  // Lưu dữ liệu trước khi tiếp tục

      // Gọi API để lấy kích thước IPA
      .then(() => fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`))
      .then(response => response.json())
      .then(data => {
        if (data.size) {
          onChange(data.size);  // Cập nhật kích thước file IPA
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