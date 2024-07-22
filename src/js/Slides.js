import React, { Component } from "react";
import styled from "styled-components";

const defaultSeparator = "\n\n---\n\n";

const SlideControlHeader = styled.div`
  background-color: #f0f0f0;
  padding: 10px;
  margin-bottom: 10px;
  font-weight: bold;
`;

const CommandBar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const CommandBarButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
`;

const SlideCommandBar = props => (
  <CommandBar>
    <CommandBarButton onClick={props.createSlideAbove}>+ Above</CommandBarButton>
    <CommandBarButton onClick={props.createSlideBelow}>+ Below</CommandBarButton>
    <CommandBarButton onClick={props.deleteSlide}>Delete</CommandBarButton>
    <CommandBarButton onClick={props.moveSlideUp}>Move Up</CommandBarButton>
    <CommandBarButton onClick={props.moveSlideDown}>Move Down</CommandBarButton>
  </CommandBar>
);

const getSlideActions = (onChange, slides, i) => {
  const slidesCopy = slides.slice();

  return {
    createSlideAbove: () => {
      slidesCopy.splice(i, 0, "");
      return onChange(slidesCopy);
    },
    createSlideBelow: () => {
      slidesCopy.splice(i + 1, 0, "");
      return onChange(slidesCopy);
    },
    deleteSlide: () => {
      slidesCopy.splice(i, 1);
      return onChange(slidesCopy);
    },
    moveSlideUp: () => {
      if (i > 0) {
        [slidesCopy[i - 1], slidesCopy[i]] = [slidesCopy[i], slidesCopy[i - 1]];
        return onChange(slidesCopy);
      }
    },
    moveSlideDown: () => {
      if (i < slidesCopy.length - 1) {
        [slidesCopy[i], slidesCopy[i + 1]] = [slidesCopy[i + 1], slidesCopy[i]];
        return onChange(slidesCopy);
      }
    }
  };
};

const SlideControl = props => {
  const MarkdownControl = CMS.getWidget("markdown").control;
  return (
    <div>
      <SlideControlHeader>Slide</SlideControlHeader>
      <SlideCommandBar {...props.commandBarActions} />
      <MarkdownControl {...props} />
    </div>
  );
};

export class SlidesControl extends Component {
  getValue() {
    return this.props.value ? this.props.value : "";
  }

  handleSlideChange(value, i) {
    const newValues = this.getValue().split(
      this.props.field.get("separator", defaultSeparator)
    );
    newValues[i] = value;
    this.props.onChange(
      newValues.join(this.props.field.get("separator", defaultSeparator))
    );
  }

  getSlideCommandBarActions(slides, i) {
    return getSlideActions(
      newSlides =>
        this.props.onChange(
          newSlides.join(this.props.field.get("separator", defaultSeparator))
        ),
      slides,
      i
    );
  }

  render() {
    const slides = this.getValue().split(
      this.props.field.get("separator", defaultSeparator)
    );
    const slideControls = slides.map((slideContent, i) => (
      <SlideControl
        {...this.props}
        key={i}
        value={slideContent}
        onChange={value => this.handleSlideChange(value, i)}
        commandBarActions={this.getSlideCommandBarActions(slides, i)}
      />
    ));
    return <div>{slideControls}</div>;
  }
}

export const SlidesPreview = props => {
  const MarkdownPreview = CMS.getWidget("markdown").preview;
  return (
    <div>
      {props.value
        .split(props.field.get("separator", defaultSeparator))
        .map((val, i) => (
          <div key={i}>
            <hr />
            <MarkdownPreview {...props} value={val} />
          </div>
        ))}
    </div>
  );
};