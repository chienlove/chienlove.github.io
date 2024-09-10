CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return { loading: false };
  },

  handleClick() {
    let plistUrl;
    if (this.props.entry.get('isFetching') === true) {
      // Đang tạo bài viết mới
      const formData = this.props.fieldsMetaData.getIn(['main_download', 'data']);
      plistUrl = formData ? formData.get('plistUrl') : null;
    } else {
      // Đang chỉnh sửa bài viết đã tồn tại
      const mainDownload = this.props.entry.getIn(['data', 'main_download']);
      plistUrl = mainDownload ? mainDownload.get('plistUrl') : null;
    }

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
    const { value, onChange, forID, classNameWrapper, setActiveStyle, setInactiveStyle } = this.props;
    const { loading } = this.state;

    return h(
      'div',
      {
        className: `${classNameWrapper} size-update-widget`,
        style: { display: 'flex', alignItems: 'center' }
      },
      h('input', {
        type: 'text',
        id: forID,
        className: classNameWrapper,
        value: value || '',
        onChange: e => onChange(e.target.value),
        onFocus: setActiveStyle,
        onBlur: setInactiveStyle,
        disabled: loading,
        style: { marginRight: '10px', width: '150px', padding: '5px' }
      }),
      h(
        'button',
        {
          className: `${classNameWrapper} btn`,
          type: 'button',
          onClick: this.handleClick,
          disabled: loading,
          style: { padding: '5px 10px' }
        },
        loading ? 'Đang cập nhật...' : 'Cập nhật kích thước'
      )
    );
  }
}));

CMS.init();