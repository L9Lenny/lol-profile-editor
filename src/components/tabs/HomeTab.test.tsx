import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeTab from './HomeTab';

describe('HomeTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        clientVersion: '1.3.7',
        setActiveTab: vi.fn()
    };

    it('should render welcome message and version', () => {
        render(<HomeTab {...mockProps} />);
        expect(screen.getByText('League Profile Tool')).toBeDefined();
        expect(screen.getByText('v1.3.7')).toBeDefined();
        expect(screen.getByText('CLIENT CONNECTED')).toBeDefined();
    });

    it('should show waiting status when LCU is not connected', () => {
        render(<HomeTab {...mockProps} lcu={null} />);
        expect(screen.getByText('WAITING FOR CLIENT')).toBeDefined();
    });

    it('should navigate to different tabs when feature cards are clicked', () => {
        render(<HomeTab {...mockProps} />);

        fireEvent.click(screen.getByText('Profile Bio').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('profile');

        fireEvent.click(screen.getByText('Music Sync').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('music');

        fireEvent.click(screen.getByText('Rank Overrides').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('rank');

        fireEvent.click(screen.getByText('Icon Swapper').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('icons');
    });
});
