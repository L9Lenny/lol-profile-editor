import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeTab from './HomeTab';

describe('HomeTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        clientVersion: '1.3.7',
        setActiveTab: vi.fn(),
        lcuRequest: vi.fn(),
    };

    it('should render profile header and categories', () => {
        render(<HomeTab {...mockProps} />);
        expect(screen.getByText('Customization')).toBeDefined();
        expect(screen.getByText('Enhancements')).toBeDefined();
        expect(screen.getByText('System')).toBeDefined();
        expect(screen.getByText(/v1.3.7/)).toBeDefined();
        expect(screen.getByText('CONNECTED')).toBeDefined();
    });

    it('should show waiting status when LCU is not connected', () => {
        render(<HomeTab {...mockProps} lcu={null} />);
        expect(screen.getByText('WAITING')).toBeDefined();
    });

    it('should navigate through categories to reach features', () => {
        render(<HomeTab {...mockProps} />);

        // Click on Customization category
        fireEvent.click(screen.getByText('Customization').closest('button')!);
        expect(screen.getAllByRole('button', { name: /BACK/i })[0]).toBeDefined();
        
        // Now Profile Bio should be visible
        fireEvent.click(screen.getByText('Profile Bio').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('profile');

        // Go back
        fireEvent.click(screen.getAllByRole('button', { name: /BACK/i })[0]!);
        expect(screen.getByText('Customization')).toBeDefined();

        // Click on Enhancements category
        fireEvent.click(screen.getByText('Enhancements').closest('button')!);
        fireEvent.click(screen.getByText('Challenge Level').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('challenge');
        fireEvent.click(screen.getByText('Music Sync').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('music');
    });

    it('should reach System features through its category', () => {
        render(<HomeTab {...mockProps} />);
        
        fireEvent.click(screen.getByText('System').closest('button')!);
        fireEvent.click(screen.getByText('System Logs').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('logs');
    });
});
