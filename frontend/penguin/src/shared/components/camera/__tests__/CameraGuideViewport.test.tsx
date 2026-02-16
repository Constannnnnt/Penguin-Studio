import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CameraGuideViewport } from '../CameraGuideViewport';

describe('CameraGuideViewport', () => {
  it('renders canonical camera guidance labels', () => {
    render(
      <CameraGuideViewport
        cameraAngle="eye-level"
        lensFocalLength="standard"
        depthOfField={50}
        focus={75}
      />
    );

    expect(screen.getByLabelText('Camera guidance preview')).toBeInTheDocument();
    expect(screen.getByText('Camera Preview')).toBeInTheDocument();
    expect(screen.getByText('Eye Level')).toBeInTheDocument();
    expect(screen.getByText('Standard Lens')).toBeInTheDocument();
    expect(screen.getByText('Balanced DOF')).toBeInTheDocument();
    expect(screen.getByText('Very Sharp Focus')).toBeInTheDocument();
  });

  it('normalizes legacy angle and lens names', () => {
    render(
      <CameraGuideViewport
        cameraAngle="bird-eye"
        lensFocalLength="telephoto"
        depthOfField={30}
        focus={60}
      />
    );

    expect(screen.getByText('Overhead')).toBeInTheDocument();
    expect(screen.getByText('Portrait / Tele')).toBeInTheDocument();
    expect(screen.getByText('Shallow DOF')).toBeInTheDocument();
    expect(screen.getByText('Sharp Focus')).toBeInTheDocument();
  });

  it('shows custom value labels when an unknown option is provided', () => {
    render(
      <CameraGuideViewport
        cameraAngle="dutch-angle"
        lensFocalLength="anamorphic"
        depthOfField={10}
        focus={95}
      />
    );

    expect(screen.getByText('Custom (Dutch Angle)')).toBeInTheDocument();
    expect(screen.getByText('Custom (Anamorphic)')).toBeInTheDocument();
    expect(screen.getByText('Very Shallow DOF')).toBeInTheDocument();
    expect(screen.getByText('Hyper Sharp Focus')).toBeInTheDocument();
  });
});
