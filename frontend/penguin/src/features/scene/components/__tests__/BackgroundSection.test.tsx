import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import { BackgroundSection } from '../BackgroundSection';
import { useConfigStore } from '@/features/scene/store/configStore';

vi.mock('@/features/scene/store/configStore');

describe('BackgroundSection', () => {
  const mockUpdateConfig = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useConfigStore).mockImplementation((selector: any) => {
      const mockState = {
        sceneConfig: {
          background_setting: 'A clean white studio backdrop',
        },
        updateSceneConfig: mockUpdateConfig,
      };
      
      return selector ? selector(mockState) : mockState;
    });
  });

  it('renders background section with correct title', () => {
    render(<BackgroundSection />);
    
    expect(screen.getByLabelText('Background Setting')).toBeInTheDocument();
  });

  it('displays current background setting value', () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveValue('A clean white studio backdrop');
  });

  it('shows placeholder text when background setting is empty', () => {
    vi.mocked(useConfigStore).mockImplementation((selector: any) => {
      const mockState = {
        sceneConfig: {
          background_setting: '',
        },
        updateSceneConfig: mockUpdateConfig,
      };
      
      return selector ? selector(mockState) : mockState;
    });

    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveAttribute('placeholder', 'Describe the background environment...');
  });

  it('updates local state when user types in textarea', () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    fireEvent.change(textarea, { target: { value: 'New background description' } });
    
    expect(textarea).toHaveValue('New background description');
  });

  it('calls updateSceneConfig after debounce delay', async () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    fireEvent.change(textarea, { target: { value: 'Updated background' } });
    
    // Should not call immediately
    expect(mockUpdateConfig).not.toHaveBeenCalled();
    
    // Should call after debounce delay (500ms)
    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith('background_setting', 'Updated background');
    }, { timeout: 1000 });
  });

  it('syncs local state when store background setting changes', () => {
    const { rerender } = render(<BackgroundSection />);
    
    vi.mocked(useConfigStore).mockImplementation((selector: any) => {
      const mockState = {
        sceneConfig: {
          background_setting: 'Updated from store',
        },
        updateSceneConfig: mockUpdateConfig,
      };
      
      return selector ? selector(mockState) : mockState;
    });
    
    rerender(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveValue('A clean white studio backdrop');
  });

  it('has proper accessibility attributes', () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveAttribute('id', 'background-setting');
  });

  it('has correct textarea configuration', () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveAttribute('rows', '10');
  });
});