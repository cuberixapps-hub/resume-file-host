import React from 'react';

interface Template2Props {
    name: string;
}

const Template2: React.FC<Template2Props> = ({ name }) => {
    return (
        <div>
            <h1>Hello, {name}!</h1>
            <p>This is a Template2 component.</p>
        </div>
    );
};

export default Template2;