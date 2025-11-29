import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BackgroundSection } from '../BackgroundSection';
import { useConfigStore } from '@/features/scene/store/configStore';

// Mock the enhanced config store
vi.mock('@/store/configStore', () => ({
  useConfigStore: vi.fn(),
}));

const mockUseConfigStore = useConfigStore as ReturnType<typeof vi.fn>;

describe('BackgroundSection', () => {
  const mockUpdateConfig = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock store state and actions
    mockUseConfigStore.mockImplementation((selector) => {
      const mockState = {
        sceneConfig: {
          background_setting: 'A clean white studio backdrop',
        },
        updateEnhancedConfig: mockUpdateConfig,
      };
      
      return selector(mockState as any);
    });
  });

  it('renders background section with correct title', () => {
    render(<BackgroundSection />);
    
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByLabelText('Background Setting')).toBeInTheDocument();
  });

  it('displays current background setting value', () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveValue('A clean white studio backdrop');
  });

  it('shows placeholder text when background setting is empty', () => {
    // Mock empty background setting
    mockUseConfigStore.mockImplementation((selector) => {
      const mockState = {
        sceneConfig: {
          background_setting: '',
        },
        updateConfig: mockUpdateConfig,
      };
      
      return selector(mockState as any);
    });

    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveAttribute('placeholder', 'Describe the background environment, setting, or backdrop for your scene...');
  });

  it('updates local state when user types in textarea', () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    fireEvent.change(textarea, { target: { value: 'New background description' } });
    
    expect(textarea).toHaveValue('New background description');
  });

  it('calls updateEnhancedConfig after debounce delay', async () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    fireEvent.change(textarea, { target: { value: 'Updated background' } });
    
    // Should not call immediately
    expect(mockUpdateConfig).not.toHaveBeenCalled();
    
    // Should call after debounce delay (300ms)
    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith('background_setting', 'Updated background');
    }, { timeout: 500 });
  });

  it('syncs local state when store background setting changes', () => {
    const { rerender } = render(<BackgroundSection />);
    
    // Update mock to return different background setting
    mockUseConfigStore.mockImplementation((selector) => {
      const mockState = {
        sceneConfig: {
          background_setting: 'Updated from store',
        },
        updateConfig: mockUpdateConfig,
      };
      
      return selector(mockState as any);
    });
    
    rerender(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveValue('Updated from store');
  });

  it('has proper accessibility attributes', () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveAttribute('id', 'background-setting');
    expect(textarea).toHaveAttribute('aria-describedby', 'background-setting-help');
    
    const helpText = screen.getByText(/This will be parsed from JSON metadata when available/);
    expect(helpText).toHaveAttribute('id', 'background-setting-help');
  });

  it('has correct textarea configuration', () => {
    render(<BackgroundSection />);
    
    const textarea = screen.getByLabelText('Background Setting');
    expect(textarea).toHaveAttribute('rows', '6');
    expect(textarea).toHaveClass('text-sm', 'sm:text-base');
  });
});